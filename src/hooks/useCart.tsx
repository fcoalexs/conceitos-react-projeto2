import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

class CustomError implements Error {
  name: string = 'CustomError';
  message: string;
  stack?: string | undefined;
  cause?: Error | undefined;

  constructor(message: string) {
    this.message = message;
  }
  
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const [responseProduct, responseStock] =  await Promise.all([
        api.get(`products/${productId}`), 
        api.get(`stock/${productId}`)
      ]);

      const product: Product = responseProduct.data;
      const stock: Stock = responseStock.data;

      const products = [...cart];
      const productIndex = products.findIndex(product => product.id === productId)

      if(productIndex >= 0) {
        if(products[productIndex].amount + 1 > stock.amount) {
          throw new CustomError('Quantidade solicitada fora de estoque');
        }

        products[productIndex].amount += 1;

        setCart(products);  
      } else {
        product.amount = 1;
        products.push(product)
        setCart(products);
      }

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(products));
    } catch(er: unknown) {
      if (er instanceof CustomError)
        toast.error(er.message);
      else {
        toast.error('Erro na adição do produto');
      }
    }
  };

  const removeProduct = (productId: number) => {
    try {

      if(!cart.some(product => product.id === productId))
        throw new Error();

      const newCart = cart.filter(product => product.id !== productId);
      setCart(newCart);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const responseStock = await api.get(`stock/${productId}`);

      const stock: Stock = responseStock.data;

      const products = [...cart];
      const productIndex = products.findIndex(product => product.id === productId);

      if(productIndex < 0 || amount < 1) {
        throw new Error();
      }
      
      if(amount > stock.amount) {
        throw new CustomError('Quantidade solicitada fora de estoque');
      }
      
      products[productIndex].amount = amount;

      setCart(products);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(products));
    } catch(er: unknown) {
      if (er instanceof CustomError)
        toast.error(er.message);
      else {
        toast.error('Erro na alteração de quantidade do produto');
      }
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
